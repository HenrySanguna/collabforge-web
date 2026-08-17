export interface Environment {
  production: boolean;
  apiUrl: string;
  wsUrl: string;
}

export const environment: Environment = {
  production: true,
  apiUrl: 'https://collabforge-api.onrender.com/api',
  wsUrl: 'https://collabforge-api.onrender.com',
};
