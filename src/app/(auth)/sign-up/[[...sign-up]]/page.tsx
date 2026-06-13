import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-bl from-sky-700 via-sky-500 to-sky-300">
      <SignUp />
    </div>
  );
}
