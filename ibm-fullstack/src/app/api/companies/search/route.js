import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');

    await connectDB();

    let companies;
    if (query) {
      companies = await Company.find({
        name: { $regex: query, $options: 'i' }
      }).select('name description').limit(10);
    } else {
      companies = await Company.find().select('name description').limit(10);
    }

    return NextResponse.json({ companies });

  } catch (error) {
    return NextResponse.json(
      { message: "Error searching companies", error: error.message },
      { status: 500 }
    );
  }
}
