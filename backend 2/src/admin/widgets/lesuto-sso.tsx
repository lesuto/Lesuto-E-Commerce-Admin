import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Button, Container, Heading, Text } from "@medusajs/ui";

const LesutoSSOWidget = () => {
  const backendCallback = "http://localhost:9000/admin/auth/lesuto";
  const ssoUrl = `https://auth.lesuto.com/?redirect=${encodeURIComponent(backendCallback)}`;

  return (
    <Container className="flex flex-col gap-y-4 items-center p-8 border-none shadow-none bg-transparent">
      <Heading level="h2" className="text-ui-fg-base">
        Lesuto Admin
      </Heading>
      <Text className="text-ui-fg-subtle">
        Sign in with your Lesuto ID
      </Text>
      <Button 
        variant="secondary" 
        className="w-full max-w-[300px]"
        onClick={() => window.location.href = ssoUrl}
      >
        Login with Lesuto
      </Button>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "login.after", 
});

export default LesutoSSOWidget;