import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Company from '@/models/Company';

export async function GET(req) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('No session found');
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log('Session found:', session);

    // Connect to database
    try {
      await connectDB();
      console.log('Connected to DB');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { message: "Database connection failed", error: dbError.message },
        { status: 500 }
      );
    }

    // Find user with populated company data
    let user;
    try {
      user = await User.findOne({ email: session.user.email }).populate('company').lean();
      console.log('User query result:', {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        hasCompany: !!user.company,
        companyId: user.company ? user.company._id.toString() : null
      });
    } catch (userError) {
      console.error('User query error:', userError);
      return NextResponse.json(
        { message: "Error finding user", error: userError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    if (!user.company) {
      return NextResponse.json({ company: null });
    }

    console.log('Looking for company with ID:', user.company);

    // Find company
    let company;
    try {
      company = await Company.findById(user.company)
        .populate('members.user', 'name email')
        .lean();
      
      console.log('Found company:', company);
    } catch (companyError) {
      console.error('Company query error:', companyError);
      return NextResponse.json(
        { message: "Error finding company", error: companyError.message },
        { status: 500 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Convert ObjectIds to strings
    company._id = company._id.toString();
    company.owner = company.owner.toString();
    
    if (company.members) {
      company.members = company.members.map(member => ({
        ...member,
        _id: member._id.toString(),
        user: member.user ? {
          _id: member.user._id.toString(),
          name: member.user.name,
          email: member.user.email
        } : null
      }));
    }

    return NextResponse.json({ company });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        message: "Error fetching company", 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
