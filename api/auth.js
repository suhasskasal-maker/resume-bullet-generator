export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ ok: false, error: "Password required" });
  }

  const correct = process.env.APP_PASSWORD;
  if (!correct) {
    return res.status(500).json({ ok: false, error: "APP_PASSWORD is not configured" });
  }

  if (password === correct) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: "Incorrect password" });
}
