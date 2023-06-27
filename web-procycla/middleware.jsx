import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      if (req.nextUrl.pathname.includes("/admin")) {
        return token?.role === "admin";
      }
      return !!token;
    }
  }
});

export const config = { matcher: ["/admin/:path*", "/profile/:path*", "/projects/:path*", "/api/:path*", "/home/:path*", "/software/:path*"] }