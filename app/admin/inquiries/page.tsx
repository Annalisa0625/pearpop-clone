// app/admin/inquiries/page.tsx
"use client";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export default function AdminInquiriesPage() {
  // 今はダミーデータ（後で Supabase テーブルに差し替え）
  const inquiries: Inquiry[] = [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">お問い合わせ管理</h1>

      {inquiries.length === 0 ? (
        <div className="border rounded p-6 bg-white text-gray-600">
          まだお問い合わせはありません。
          <p className="text-sm mt-2">
            ※ 今後 inquiries テーブルを追加するとここに表示されます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((q) => (
            <div key={q.id} className="border rounded p-4 bg-white">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>{q.name}（{q.email}）</span>
                <span>{new Date(q.created_at).toLocaleString()}</span>
              </div>
              <p className="text-gray-800">{q.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
