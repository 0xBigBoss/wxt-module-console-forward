// Simple console forwarding server
Bun.serve({
  port: 3002,
  fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    
    if (request.method === "POST" && new URL(request.url).pathname === "/api/debug/client-logs") {
      return request.json().then((logData) => {
        const prefix = `[${logData.context}] [${logData.level}]`;
        console.log(`${prefix} ${logData.message}`);
        
        return new Response("OK", {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS", 
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }).catch(() => {
        return new Response("Bad Request", { status: 400 });
      });
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log("Console forwarding server started on http://localhost:3002");