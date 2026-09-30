import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyName, password } = await req.json();

    if (!companyName || !password) {
      return NextResponse.json({ 
        error: 'Company name and password are required' 
      }, { status: 400 });
    }

    await connectDB();

    // Find the company
    const company = await Company.findOne({ name: companyName });
    if (!company) {
      return NextResponse.json({ 
        error: 'Company not found' 
      }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, company.password);
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Invalid password' 
      }, { status: 401 });
    }

    // Check if user is already a member
    const existingMember = company.members.find(
      member => member.user.toString() === session.user.id
    );
    
    if (existingMember) {
      return NextResponse.json({ 
        error: 'You are already a member of this company' 
      }, { status: 400 });
    }

    // Add user to company members
    company.members.push({
      user: session.user.id,
      role: 'Employee' // Default role
    });

    await company.save();

    // Update user's company reference
    await User.findByIdAndUpdate(session.user.id, {
      company: company._id
    });

    return NextResponse.json({ 
      message: 'Successfully joined the company',
      company: {
        _id: company._id,
        name: company.name,
        description: company.description
      }
    });

  } catch (error) {
    console.error('Error joining company:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
