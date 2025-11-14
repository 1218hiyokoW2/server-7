import { Hono } from 'jsr:@hono/hono';
import { serveStatic } from 'jsr:@hono/hono/deno';
const app = new Hono();

app.use('/*', serveStatic({ root: './public' }));

// データベースの準備
const kv = await Deno.openKv();

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
  return c.json({ path: c.req.path });
});

/*** リソースの取得（コレクション） ***/
app.get('/api/pokemons', async (c) => {
  return c.json({ path: c.req.path });
});

/*** リソースの更新 ***/
app.put('/api/pokemons/:id', async (c) => {
  return c.json({ path: c.req.path });
});

/*** リソースの削除 ***/
app.delete('/api/pokemons/:id', async (c) => {
  return c.json({ path: c.req.path });
});

/*** リソースをすべて削除（練習用） ***/
app.delete('/api/pokemons', async (c) => {
  return c.json({ path: c.req.path });
});

Deno.serve(app.fetch);
