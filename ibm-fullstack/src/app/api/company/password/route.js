import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import bcrypt from 'bcryptjs';

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, companyId } = await req.json();
    
    console.log('Password update request:', { 
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword,
      hasCompanyId: !!companyId,
      userId: session.user.id
    });

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the company by ID if provided, otherwise find by user
    let company;
    if (companyId) {
      company = await Company.findById(companyId);
      
      // Verify user has admin access to this company
      if (!company || (!company.owner.equals(session.user.id) && !company.admins?.includes(session.user.id))) {
        return NextResponse.json(
          { error: 'Company not found or you do not have admin access' },
          { status: 404 }
        );
      }
    } else {
      // Find the company where the user is an admin
      company = await Company.findOne({
        $or: [
          { owner: session.user.id },
          { admins: session.user.id }
        ]
      });
    }

    if (!company) {
      console.error('Company not found or access denied:', { 
        companyId, 
        userId: session.user.id 
      });
      return NextResponse.json(
        { error: 'Company not found or you do not have admin access' },
        { status: 404 }
      );
    }

    console.log('Company found:', { 
      companyId: company._id, 
      hasPassword: !!company.password,
      ownerId: company.owner 
    });

    // Verify current password if company has one and currentPassword is provided
    if (company.password && currentPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, company.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    } else if (company.password && !currentPassword && !companyId) {
      // If company has password but no current password provided (and no companyId for admin override)
      return NextResponse.json(
        { error: 'Current password is required to change company password' },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update company password
    company.password = hashedPassword;
    await company.save();

    console.log('Password updated successfully for company:', company._id);

    return NextResponse.json({
      message: 'Company password updated successfully'
    });

  } catch (error) {
    console.error('Error updating company password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
