import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0eee6",
      }}
    >
      <AuthenticateWithRedirectCallback
        continueSignUpUrl="/"
        signUpForceRedirectUrl="/"
        signInForceRedirectUrl="/"
      />
    </div>
  );
}
