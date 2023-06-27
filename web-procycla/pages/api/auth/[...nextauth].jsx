import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions = {
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60 // 30 days
    },
    providers: [
        CredentialsProvider({
            type: "credentials",
            credentials: {},
            authorize: async credentials => {
                const { email, password, code } = credentials;

                let res;
                if(code) {
                    res = await fetch(process.env.BACK_API_AUTH_URL + "auth/token/2fa?" + new URLSearchParams({
                        email: email,
                        password: password,
                        code: code
                    }));
                }
                else {
                    res = await fetch(process.env.BACK_API_AUTH_URL + "auth/token?" + new URLSearchParams({
                        email: email,
                        password: password
                    }));
                }
              
                if(res.status !== 200) {
                    const error = await res.json();;
                    throw new Error(error.message);
                }
              
                const data = await res.json();
                return data;
            }
        })
    ],
    pages: {
        signIn: "/auth/login"
    },
    callbacks: {
        async jwt({ token, user }) {
            if(user) {
                token.id = user.id;
                token.email = user.email;
                token.role = user.role;
                token.session = user.session;
                token.accessToken = user.accessToken;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.email = token.email;
            session.user.role = token.role;
            session.user.session = token.session;
            session.user.accessToken = token.accessToken;
            return session;
        }
    }
};

export default NextAuth(authOptions);