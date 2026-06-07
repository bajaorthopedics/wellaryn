import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    provider: 'apple_health',
    status: 'ios_only',
    message: 'Apple Health data can only be synced through the Wellaryn iOS app using HealthKit. There is no web-based API for Apple Health.',
    instructions: [
      '1. Download the Wellaryn iOS app from the App Store',
      '2. Sign in with the same account',
      '3. Grant HealthKit permissions when prompted',
      '4. Your Apple Health data will sync automatically',
    ],
    supportedData: [
      'Heart Rate & HRV',
      'Sleep Analysis',
      'Activity & Workouts',
      'Steps & Distance',
      'Resting Heart Rate',
      'VO2 Max',
      'Respiratory Rate',
    ],
    docs: 'https://developer.apple.com/documentation/healthkit',
  });
}
