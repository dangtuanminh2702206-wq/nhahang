import { createServer } from "node:http";

const port = Number(process.env.SUPABASE_MOCK_PORT || 54321);
const responseBody = JSON.stringify({
  error: "invalid_token",
  message: "CI mock does not authenticate users",
});

const server = createServer((_request, response) => {
  response.writeHead(401, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  });
  response.end(responseBody);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Supabase HTTP mock listening on 127.0.0.1:${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
