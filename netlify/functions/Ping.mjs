export const handler = async () => ({
  statusCode: 200,
  headers: {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": "*"
  },
  body: "ok"
});
