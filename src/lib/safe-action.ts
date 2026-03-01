import { createSafeActionClient } from "next-safe-action";
import { auth } from "@/auth";

// Base client for public actions
export const actionClient = createSafeActionClient({
    // Can add global error handling here
    handleServerError(e) {
        if (e instanceof Error) {
            return e.message;
        }
        return "Something went wrong.";
    },
});

// Authenticated client that checks for an active session
export const authActionClient = actionClient.use(async ({ next }) => {
    const session = await auth();

    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    return next({ ctx: { session } });
});
