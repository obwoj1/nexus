export {};

declare global {
  interface Window {
    nexusDesktop?: {
      openOAuthUrl(url: string): Promise<void>;
      onOAuthCallback(callback: (url: string) => void | Promise<void>): () => void;
    };
  }
}
