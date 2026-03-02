import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/apps/connect?error=${error}`);
  }

  // Check if this is an apps flow request
  if (state && state.startsWith('github_')) {
    try {
      // Extract the state data
      const stateBase64 = state.replace('github_', '');
      const stateData = JSON.parse(Buffer.from(stateBase64, 'base64').toString());
      
      if (stateData.flowType === 'apps') {
        // This is an apps flow - redirect to apps connect page with the code
        const redirectUrl = new URL('/apps/connect', request.nextUrl.origin);
        redirectUrl.searchParams.set('code', code || '');
        redirectUrl.searchParams.set('network', 'github');
        
        return NextResponse.redirect(redirectUrl.toString());
      }
    } catch (error) {
      console.error('Error parsing GitHub state:', error);
    }
  }

  // For regular NextAuth flows or when state parsing fails, 
  // delegate to NextAuth handlers
  const { handlers } = await import('@/lib/auth');
  return handlers.GET(request);
}