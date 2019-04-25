export interface MakeWebClientOptionals {
  hostUrl?: string,
  hAppUrl?: string,
  dnaHash?: string,
  preCall?: PreCallFunction,
  postCall?: PostCallFunction,
  postConnect?: PostConnectFunction,
}

type Call = (...segments: Array<string>) => (params: any) => Promise<any>
type CallZome = (instanceId: string, zome: string, func: string) => (params: any) => Promise<any>
type Close = () => Promise<any>

export interface HolochainClient {
  connect: (paramUrl?: string) => Promise<{call: Call, callZome: CallZome, close: Close, ws: any}>
}

export type WebsocketClient = any
export type Keypair = any

export type PreCallFunction = (callString: string, params: any) => Promise<{ callString: string, params: any }>
export type PostCallFunction = (response: string) => string
export type PostConnectFunction = (ws: WebsocketClient) => Promise<WebsocketClient>
