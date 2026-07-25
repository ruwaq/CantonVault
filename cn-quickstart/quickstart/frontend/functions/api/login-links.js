// PUBLIC route (allowlisted in _middleware.js). Returns the demo login entry
// point. The SPA's LoginView navigates here and then POSTs /api/auth/login.
export const onRequest = async () => {
  return Response.json([{ name: 'CantonVault Demo', url: '/login' }]);
};
