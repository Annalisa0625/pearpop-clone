//lib/types.ts
export type ChatListItem = {
  id: string;

  creator: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;

  company: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;

  request: {
    id: string;
    product_name: string | null;
  } | null;
};
