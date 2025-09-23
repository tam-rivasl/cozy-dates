'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { suggestDateIdeas, type SuggestDateIdeasInput } from '@/ai/flows/suggest-date-ideas';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  userInterests: z.string().min(3, 'Please share at least one interest.'),
  partnerInterests: z.string().min(3, 'Please share at least one of your partner\'s interests.'),
  pastActivities: z.string().optional(),
});

export function DateSuggester() {
  const [isOpen, setOpen] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userInterests: '',
      partnerInterests: '',
      pastActivities: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setSuggestion(null);
    try {
      const result = await suggestDateIdeas(values as SuggestDateIdeasInput);
      setSuggestion(result.dateIdeas);
    } catch (error) {
      console.error('Error suggesting date ideas:', error);
      toast({
        title: 'Oh no!',
        description: 'Something went wrong while generating ideas. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false);
    }
  }
  
  const handleSheetOpen = (open: boolean) => {
    setOpen(open);
    if (!open) {
      form.reset();
      setSuggestion(null);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Wand2 className="mr-2 h-4 w-4" />
          Get Date Ideas
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <ScrollArea className="h-full pr-4">
          <SheetHeader>
            <SheetTitle>AI Date Idea Generator</SheetTitle>
            <SheetDescription>
              Let AI help you plan the perfect date! Tell us a bit about yourselves.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="userInterests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Interests</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., hiking, painting, indie music" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partnerInterests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your partner&apos;s Interests</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., sci-fi movies, cooking, dogs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pastActivities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Past Dates you&apos;ve Enjoyed (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., visiting the art museum, picnics in the park" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Ideas
                </Button>
              </form>
            </Form>

            {suggestion && (
              <div className="mt-8">
                <h3 className="text-lg font-headline font-semibold mb-2">Here are some ideas for you!</h3>
                <div className="prose prose-sm dark:prose-invert bg-accent/50 rounded-lg p-4 whitespace-pre-wrap font-body">
                  {suggestion}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

