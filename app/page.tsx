"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://dnegkvwqcufmwubouafd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZWdrdndxY3VmbXd1Ym91YWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5OTQ3MTcsImV4cCI6MjA2NTU3MDcxN30.7W7Wt2UdKzeex1NnMxXIQ3VjTUxvi0pCo2FUxrEiUvU"
);

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "github" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      {user ? (
        <>
          <h1 className="text-2xl">ようこそ、{user.email} さん！</h1>
          <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
            ログアウト
          </button>
        </>
      ) : (
        <>
          <h1 className="text-2xl mb-4">Pearpop風MVPへようこそ</h1>
          <button onClick={handleLogin} className="px-4 py-2 bg-blue-500 text-white rounded">
            GitHubでログイン
          </button>
        </>
      )}
    </main>
  );
}
