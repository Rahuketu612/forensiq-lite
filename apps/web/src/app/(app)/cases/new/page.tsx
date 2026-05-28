'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts';
import { caseApi, CreateCaseDto } from '@/lib/cases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function NewCasePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CreateCaseDto>({
    defaultValues: {
      caseNumber: '',
      title: '',
      description: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const onSubmit = async (data: CreateCaseDto) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const newCase = await caseApi.create(data);
      router.push(`/cases/${newCase.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center">
          <Link href="/cases" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Cases</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Case</h1>
          <p className="text-muted-foreground mt-1">
            Start a new forensic audit investigation
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
              <CardDescription>
                Enter the basic information for your forensic audit case
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Case Number */}
              <div className="space-y-2">
                <label htmlFor="caseNumber" className="text-sm font-medium">
                  Case Number <span className="text-destructive">*</span>
                </label>
                <Input
                  id="caseNumber"
                  placeholder="FRA-2024-001"
                  {...register('caseNumber', {
                    required: 'Case number is required',
                    minLength: { value: 3, message: 'Case number must be at least 3 characters' },
                    maxLength: { value: 50, message: 'Case number must not exceed 50 characters' },
                  })}
                  disabled={isSubmitting}
                />
                {errors.caseNumber && (
                  <p className="text-sm text-destructive">{errors.caseNumber.message}</p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Case Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="title"
                  placeholder="Suspicious Transaction Analysis - ABC Corp"
                  {...register('title', {
                    required: 'Title is required',
                    minLength: { value: 5, message: 'Title must be at least 5 characters' },
                    maxLength: { value: 200, message: 'Title must not exceed 200 characters' },
                  })}
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Provide a brief description of the investigation..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('description')}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>
                Optional details about the client being investigated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Name */}
              <div className="space-y-2">
                <label htmlFor="clientName" className="text-sm font-medium">
                  Client Name
                </label>
                <Input
                  id="clientName"
                  placeholder="John Smith"
                  {...register('clientName')}
                  disabled={isSubmitting}
                />
              </div>

              {/* Client Email */}
              <div className="space-y-2">
                <label htmlFor="clientEmail" className="text-sm font-medium">
                  Client Email
                </label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@company.com"
                  {...register('clientEmail')}
                  disabled={isSubmitting}
                />
              </div>

              {/* Client Phone */}
              <div className="space-y-2">
                <label htmlFor="clientPhone" className="text-sm font-medium">
                  Client Phone
                </label>
                <Input
                  id="clientPhone"
                  placeholder="+91 9876543210"
                  {...register('clientPhone')}
                  disabled={isSubmitting}
                />
              </div>

              {/* Client Address */}
              <div className="space-y-2">
                <label htmlFor="clientAddress" className="text-sm font-medium">
                  Client Address
                </label>
                <Input
                  id="clientAddress"
                  placeholder="123 Business Street, Mumbai 400001"
                  {...register('clientAddress')}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/cases')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Case
              </Button>
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
}