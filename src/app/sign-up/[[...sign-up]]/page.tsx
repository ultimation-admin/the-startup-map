import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f8f8fa] p-4">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/" fallbackRedirectUrl="/" />
    </div>
  );
}
