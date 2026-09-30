import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find company where user is owner or member
    const company = await Company.findOne({
      $or: [
        { owner: session.user.id },
        { 'members.user': session.user.id }
      ]
    }).populate('members.user', 'name email').populate('owner', 'name email');

    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    return Response.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, password } = await req.json();

    if (!name || !description || !password) {
      return Response.json({ 
        error: 'Company name, description, and password are required' 
      }, { status: 400 });
    }

    await connectDB();

    // Check if company name already exists
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return Response.json({ 
        error: 'Company name already exists. Please choose a different name or join the existing company.' 
      }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the company
    const company = new Company({
      name,
      description,
      password: hashedPassword,
      owner: session.user.id,
      members: [{
        user: session.user.id,
        role: 'Owner'
      }]
    });

    await company.save();

    // Update user's company reference
    await User.findByIdAndUpdate(session.user.id, {
      company: company._id
    });

    return Response.json({ 
      message: 'Company created successfully',
      company: {
        _id: company._id,
        name: company.name,
        description: company.description
      }
    });

  } catch (error) {
    console.error('Error creating company:', error);
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
