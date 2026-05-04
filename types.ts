// types.ts

export type Request = {
  id: string;
  created_at: string;
  requester_id: string | null;
  message: string | null;
  status: string;
  creator_id: string | null;
  category: string | null;
  project_id: string | null;
  updated_at: string | null;
  menu_id: string | null;

  // リレーションで取得している追加情報
  sender?: {
    username: string;
  };
  menu?: {
    title: string;
    price: number;
  };
};
