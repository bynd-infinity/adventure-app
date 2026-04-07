export type SessionRow = {
  id: string;
  code: string;
  status: string;
  current_scene: string;
  turn_index: number;
};

export type PlayerRow = {
  id: string;
  session_id: string;
  name: string;
  "class": string;
  hp: number;
  is_host: boolean;
  is_ready: boolean;
  turn_order: number;
  created_at?: string;
};
