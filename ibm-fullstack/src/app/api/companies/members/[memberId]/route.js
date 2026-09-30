import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = params;
    const { companyId } = await request.json();

    await connectDB();

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (String(company.owner) !== session.user.id) {
      return NextResponse.json({ error: 'Only company owner can remove members' }, { status: 403 });
    }

    // Don't allow removing the owner
    if (String(company.owner) === memberId) {
      return NextResponse.json({ error: 'Cannot remove the company owner' }, { status: 400 });
    }

    // Remove the member
    company.members = company.members.filter(member => String(member.user) !== memberId);
    await company.save();

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
