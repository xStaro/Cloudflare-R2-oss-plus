import {get_auth_status} from "@/utils/auth";

export async function onRequest(context) {
   if(!get_auth_status(context)){
    return new Response(JSON.stringify({ error: "没有操作权限" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
    });
   }

    return new Response("access", {
        status: 200,
    });
}