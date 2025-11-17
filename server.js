import { Hono } from 'jsr:@hono/hono';
import { serveStatic } from 'jsr:@hono/hono/deno';
const app = new Hono();

app.use('/*', serveStatic({ root: './public' }));

// データベースの準備
const kv = await Deno.openKv();

async function getNextId() {
  // pokemonコレクション用のカウンタのキー
  const key = ['counter', 'pokemon'];

  // アトミック処理の中でカウンターに1を足す
  const res = await kv.atomic().sum(key, 1n).commit();

  // 確認
  if (!res.ok) {
    console.error('IDの生成に失敗しました。');
    return null;
  }

  // カウンターをgetして…
  const counter = await kv.get(key);

  // Number型としてreturnする
  return Number(counter.value);
}

/***  リソースの作成 ***/
app.post('/api/pokemons', async (c) => {
  // リクエストボディを取得
  const body = await c.req.parseBody();
  const record = JSON.parse(body['record']);

  // IDと生成時刻を生成してレコードに追加
  const id = await getNextId();
  record.id = id;
  record.createdAt = new Date().toISOString();

  // リソースの作成
  await kv.set(['pokemons', id], record);

  // レスポンスの作成
  c.status(201); // 201 Created
  c.header('Location', `/api/pokemons/${id}`);

  return c.json({ record });
});

/*** リソースの取得（レコード単体） ***/
app.get('/api/pokemons/:id', async (c) => {
  // パラメータの取得と検証
  const id = Number(c.req.param('id'));
  // リソース（レコード）の取得
  const pkmn = await kv.get(['pokemons', id]);
  // レコードがあったとき
  if (pkmn.value) {
    return c.json(pkmn.value);
  }
  // レコードがなかったとき
  else {
    c.status(404); // 404 Not Found
    return c.json({ message: `IDが ${id} のポケモンはいませんでした。` });
  }
  // return c.json({ path: c.req.path });
});

/*** リソースの取得（コレクション） ***/
app.get('/api/pokemons', async (c) => {
  // コレクションの取得
  const pkmns = await kv.list({ prefix: ['pokemons'] });
  // レコードがあったとき
  const pkmnList = await Array.fromAsync(pkmns);
  if (pkmnList.length > 0) {
    return c.json(pkmnList.map((e) => e.value));
  }
  // レコードが1つもなかったとき
  else {
    c.status(404); // 404 Not Found
    return c.json({ message: 'pokemonコレクションのデータは1つもありませんでした。' });
  }
  // return c.json({ path: c.req.path });
});

/*** リソースの更新 ***/
app.put('/api/pokemons/:id', async (c) => {
  // パラメータの取得と検証
  const id = Number(c.req.param('id'));
  if (isNaN(id) || !Number.isInteger(id)) {
    c.status(400); // 400 Bad Request
    return c.json({ message: '更新したいポケモンのIDを正しく指定してください。' });
  }
  // データベースにレコードがあるか確認
  const pkmns = await kv.list({ prefix: ['pokemons'] });
  let existed = false;
  for await (const pkmn of pkmns) {
    if (pkmn.value.id == id) {
      existed = true;
      break;
    }
  }
  // レコードがある（更新）
  if (existed) {
    // リクエストボディを取得
    const body = await c.req.parseBody();
    const record = JSON.parse(body['record']);
    // リソースを更新（上書き）
    await kv.set(['pokemons', id], record);
    c.status(204); // 204 No Content
    return c.body(null);
  }
  // レコードがない（何もしない）
  else {
    c.status(404); // 404 Not Found
    return c.json({ message: `IDが ${id} のポケモンはいませんでした。` });
  }
  // return c.json({ path: c.req.path });
});

/*** リソースの削除 ***/
app.delete('/api/pokemons/:id', async (c) => {
  // パラメーターの取得
  const id = Number(c.req.param('id'));

  // データベースにレコードがあるか確認
  const pkmns = await kv.list({ prefix: ['pokemons'] });
  let existed = false;
  for await (const pkmn of pkmns) {
    if (pkmn.value.id == id) {
      existed = true;
      break;
    }
  }

  // レコードがある（削除）
  if (existed) {
    await kv.delete(['pokemons', id]);
    c.status(204); // 204 No Content
    return c.body(null);
  }
  // レコードがない
  else {
    c.status(404); // 404 Not Found
    return c.json({ message: `IDが ${id} のポケモンはいませんでした。` });
  }
  // return c.json({ path: c.req.path });
});

/*** リソースをすべて削除（練習用） ***/
app.delete('/api/pokemons', async (c) => {
  // return c.json({ path: c.req.path });
});

Deno.serve(app.fetch);
