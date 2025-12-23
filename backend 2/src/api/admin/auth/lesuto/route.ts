import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import jwt from "jsonwebtoken";
export const AUTHENTICATE = false;
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).send("<h1>Error: No token provided</h1>");
  }
  const secret = process.env.LESUTO_SSO_SECRET;
 
  const userModuleService = req.scope.resolve(Modules.USER);
  const authModuleService = req.scope.resolve(Modules.AUTH);
  try {
    // 1. Verify the JWT from Firebase Function
    const decoded: any = jwt.verify(token, secret!);
    const email = decoded.sub;
    const name = decoded.name;
    const lesutoUid = decoded.app_metadata?.lesuto_uid;
    if (!email) throw new Error("Token missing email (sub)");
    // 2. Find or Create User
    const users = await userModuleService.listUsers({ email: email }) || [];
    let user = users[0];
    if (!user) {
      const nameParts = (name || "Lesuto User").split(" ");
      user = await userModuleService.createUsers({
        email: email,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(" ") || "User",
      });
    }
    // 3. Link Identity (Using "emailpass" to bypass config whitelist)
    const PROVIDER_ID = "emailpass";
    let authIdentityId: string | undefined;
    const providerIdentities = await authModuleService.listProviderIdentities({
        entity_id: email,
        provider: PROVIDER_ID
    } as any);
    if (providerIdentities.length > 0) {
        authIdentityId = providerIdentities[0].auth_identity_id as string;
    }
   
    if (!authIdentityId) {
        try {
            const newIdentity = await authModuleService.createAuthIdentities([{
                provider: PROVIDER_ID,
                entity_id: email,
                app_metadata: { lesuto_uid: lesutoUid },
                user_id: user.id,
            }] as any);
            authIdentityId = newIdentity[0].id;
        } catch (err: any) {
            // Race condition retry
            const retry = await authModuleService.listProviderIdentities({
                entity_id: email,
                provider: PROVIDER_ID
            } as any);
            authIdentityId = retry[0]?.auth_identity_id as string;
        }
    }
    // 4. Manual Session Injection
    if ((req as any).session) {
        (req as any).session.auth_context = {
            auth_identity_id: authIdentityId,
            actor_id: user.id,
            actor_type: "user",
            auth_scope: "admin"
        };

        // Cookie Config
        if ((req as any).session.cookie) {
            (req as any).session.cookie.path = "/";
            (req as any).session.cookie.secure = false;
            (req as any).session.cookie.sameSite = "lax";
            (req as any).session.cookie.maxAge = 24 * 60 * 60 * 1000;
        }
        (req as any).session.save((err: any) => {
            if (err) return res.status(500).send("Session Save Failed");
           
            // 5. Diagnostic: Check if session works immediately
            res.send(`
                <!DOCTYPE html>
                <html>
                <body>
                    <h2>Validating Session...</h2>
                    <div id="status">Checking...</div>
                    <script>
                        fetch('/admin/users/me', { headers: { 'Accept': 'application/json' }, credentials: 'include' })
                        .then(res => {
                            if(res.ok) {
                                document.getElementById('status').innerText = 'Authorized';
                                window.location.href = "/app";
                            } else {
                                document.getElementById('status').innerText = 'Unauthorized (' + res.status + ')';
                            }
                        });
                    </script>
                </body>
                </html>
            `);
        });
    } else {
        res.status(500).send("No session object found");
    }
  } catch (error: any) {
    res.status(401).send(`<h1>Login Failed</h1><p>${error.message}</p>`);
  }
}