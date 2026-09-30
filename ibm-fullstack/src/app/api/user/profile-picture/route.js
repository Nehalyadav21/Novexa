import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('profilePicture');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'profile-pictures',
          public_id: `user-${session.user.id}`,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: 'fill' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    await connectDB();

    // Update user profile picture URL
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { profilePicture: uploadResult.secure_url },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      profilePicture: uploadResult.secure_url,
      message: 'Profile picture updated successfully'
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return NextResponse.json({
      error: 'Failed to upload profile picture',
      details: error.message
    }, { status: 500 });
  }
}
