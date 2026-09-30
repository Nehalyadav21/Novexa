import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error('No user found with this email');
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) {
          throw new Error('Incorrect password');
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          company: user.company?.toString(),
          profilePicture: user.profilePicture,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    signOut: '/',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async jwt({ token, user, trigger, session }) {
      console.log('JWT Callback:', { 
        trigger,
        hasUser: !!user,
        userData: user,
        currentToken: token,
        sessionData: session
      });

      if (user) {
        // Initial sign in
        token.id = user.id;
        token.company = user.company;
        token.profilePicture = user.profilePicture;
        console.log('JWT updated from user:', token);
      }

      // Handle profile updates and company updates
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.profilePicture) token.profilePicture = session.profilePicture;
        if (session.company) {
          token.company = session.company;
          console.log('JWT updated company from session update:', session.company);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.company = token.company;
        session.user.profilePicture = token.profilePicture;
      }
      return session;
    }
  },
};
