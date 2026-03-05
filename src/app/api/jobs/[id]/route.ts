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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const result = await getJobAndVerifyOwnership(id);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const body = await request.json();

        const updatedJob = await prisma.job.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(updatedJob);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
