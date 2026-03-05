import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

async function getJobAndVerifyOwnership(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) return { error: "Unauthorized", status: 401 };

    const job = await prisma.job.findUnique({
        where: { id },
    });

    if (!job) return { error: "Job not found", status: 404 };
    if (job.userId !== (session.user as any).id) return { error: "Unauthorized", status: 403 };

    return { job };
}

export async function GET(
    request: Request,
    context: any
) {
    try {
        const params = await context.params;
        const id = params?.id;

        if (!id) return NextResponse.json({ error: "Job ID is required" }, { status: 400 });

        const result = await getJobAndVerifyOwnership(id);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json(result.job);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    context: any // Support both Promise and non-Promise context for Next 14/15
) {
    try {
        const params = await context.params;
        const id = params?.id;

        if (!id) {
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
        }

        const result = await getJobAndVerifyOwnership(id);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const body = await request.json();
        console.log("PATCH request for ID:", id);
        console.log("Body received:", body);

        const { title, company, url, description, status, location } = body;

        const updatedJob = await prisma.job.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(company !== undefined && { company }),
                ...(url !== undefined && { url }),
                ...(description !== undefined && { description }),
                ...(status !== undefined && { status }),
                ...(location !== undefined && { location }),
            },
        });

        console.log("Job updated successfully:", updatedJob.id);
        return NextResponse.json(updatedJob);
    } catch (error: unknown) {
        console.error("Failed to update job error details:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: any
) {
    try {
        const params = await context.params;
        const id = params?.id;

        if (!id) return NextResponse.json({ error: "Job ID is required" }, { status: 400 });

        const result = await getJobAndVerifyOwnership(id);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        await prisma.job.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }
}
