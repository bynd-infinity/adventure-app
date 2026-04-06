export type Player = {
  id: string;
  name: string;
  "class": string;
  hp: number;
  isHost: boolean;
  turnOrder: number;
  ready: boolean;
};

export type Session = {
  id: string;
  code: string;
  status: string;
  currentScene: string;
  turnIndex: number;
};
