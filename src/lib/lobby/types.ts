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
  character_class: string;
  hp: number;
  is_host: boolean;
  ready: boolean;
  turn_order: number;
};
