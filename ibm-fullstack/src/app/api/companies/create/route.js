import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, description } = await req.json();

    if (!name || !description) {
      return NextResponse.json(
        { message: "Company name and description are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if company name already exists
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return NextResponse.json(
        { message: "Company name already exists" },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findOne({ email: session.user.email });

    // Create company with default owner role
    const company = await Company.create({
      name,
      description,
      owner: user._id,
      roles: [{ 
        name: 'Owner', 
        description: 'Company owner with full administrative rights',
        seniorityLevel: 1
      }],
      members: [{ user: user._id, role: 'Owner' }]
    });

    console.log('Created company:', company);

    // Update user with company
    const updatedUser = await User.findByIdAndUpdate(
      user._id, 
      { company: company._id },
      { new: true }
    );

    console.log('Updated user:', updatedUser);

    return NextResponse.json(
      { message: "Company created successfully", company },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { message: "Error creating company", error: error.message },
      { status: 500 }
    );
  }
}
