import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';

export async function POST(req) {
  try {
    console.log('=== Companies Join API Called ===');
    
    const session = await getServerSession(authOptions);
    console.log('Session check result:', {
      hasSession: !!session,
      sessionUser: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      } : null
    });
    
    if (!session) {
      console.log('No session found, returning 401');
      return NextResponse.json(
        { message: "Unauthorized", error: "No valid session found" },
        { status: 401 }
      );
    }

    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json(
        { message: "Company ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      console.error('User not found:', session.user.email);
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 }
      );
    }

    // Check if user already has a company
    if (user.company) {
      console.error('User already has a company:', user.company);
      return NextResponse.json(
        { message: "User is already a member of a company" },
        { status: 400 }
      );
    }

    // Get company
    const company = await Company.findById(companyId);
    if (!company) {
      console.error('Company not found:', companyId);
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Add user to company members if not already a member
    const isMember = company.members.some(member => 
      member.user && member.user.toString() === user._id.toString()
    );

    if (!isMember) {
      company.members.push({
        user: user._id,
        role: 'Member'
      });
      await company.save();
    }

    // Update user's company
    user.company = company._id;
    await user.save();
    
    console.log('Successfully updated user and company:', {
      userId: user._id,
      companyId: company._id
    });

    // Get updated session
    const updatedSession = await getServerSession(authOptions);
    if (!updatedSession) {
      console.error('Could not get updated session');
    }

    // Return updated user info and session
    return NextResponse.json(
      { 
        message: "Successfully joined company",
        company: {
          id: company._id.toString(),
          name: company.name,
          description: company.description
        },
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          company: company._id.toString()
        },
        session: updatedSession
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Companies Join API Error ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { 
        message: "Error joining company", 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
