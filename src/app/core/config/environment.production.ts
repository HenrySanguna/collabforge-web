export interface Environment {
  production: boolean;
  apiUrl: string;
  wsUrl: string;
}

export const environment: Environment = {
  production: true,
  apiUrl: 'https://collabforge-api-1.onrender.com/api',
  wsUrl: 'https://collabforge-api-1.onrender.com',
};
