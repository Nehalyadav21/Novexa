import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    console.log('Current user ID:', session.user.id);

    // Get current user to find their company
    const currentUser = await User.findById(session.user.id);
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
      console.log('Current user not found in database');
      return Response.json([]);
    }

    // For now, let's return all users except current user regardless of company
    // This will help us debug the company issue
    const users = await User.find(
      { _id: { $ne: session.user.id } },
      { name: 1, email: 1, image: 1, company: 1 }
    ).sort({ name: 1 });

    console.log('Found users:', users.length);
    console.log('Users:', users);

    return Response.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
