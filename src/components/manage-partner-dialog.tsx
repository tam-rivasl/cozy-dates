
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Check, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Profile, CoupleInvitation } from '@/lib/types';

interface ManagePartnerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  profile: Profile | null;
  partnerProfile: Profile | null;
}

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export function ManagePartnerDialog({ isOpen, onOpenChange, profile, partnerProfile }: ManagePartnerDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Mock data, replace with state from your local data fetching
  const [invitations, setInvitations] = useState<CoupleInvitation[]>([]);
  const [sentInvitation, setSentInvitation] = useState<CoupleInvitation | null>(null);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const handleInvite = async (values: InviteFormValues) => {
    setIsLoading(true);
    console.log('Inviting partner:', values.email);
    // Replace with local API call logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: 'Invitation Sent!', description: `Your invitation to ${values.email} has been sent.` });
    form.reset();
    setIsLoading(false);
    // You might want to update sentInvitation state here
  };
  
  const handleAccept = async (id: string) => {
    console.log('Accepting invitation:', id);
    // Replace with local API call logic
    toast({ title: 'Invitation Accepted!', description: "You are now paired!" });
  }
  
  const handleDecline = async (id: string) => {
    console.log('Declining invitation:', id);
    // Replace with local API call logic
    toast({ title: 'Invitation Declined', variant: 'destructive' });
  }

  const handleUnpair = async () => {
    const confirmed = window.confirm("Are you sure you want to unpair? This action cannot be undone.");
    if (confirmed) {
        console.log('Unpairing...');
        // Replace with local API call logic
        toast({ title: 'Successfully Unpaired', variant: 'destructive' });
    }
  }
  
  const renderContent = () => {
    if (partnerProfile) {
      return (
        <div>
          <DialogDescription className="mb-4">You are currently paired with:</DialogDescription>
          <div className="flex items-center space-x-4 p-4 rounded-md border bg-accent/50">
            <Avatar>
              <AvatarImage src={partnerProfile.avatar_url} alt={partnerProfile.username} />
              <AvatarFallback>{partnerProfile.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="font-semibold">{partnerProfile.username}</p>
          </div>
           <DialogFooter className="mt-6">
            <Button variant="destructive" onClick={handleUnpair}>Unpair</Button>
          </DialogFooter>
        </div>
      );
    }
    
    if (invitations.length > 0) {
        return (
             <div>
                <DialogDescription className="mb-4">You have pending invitations!</DialogDescription>
                {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-md border">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={inv.profiles.avatar_url} alt={inv.profiles.username} />
                                <AvatarFallback>{inv.profiles.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className='font-medium'>{inv.profiles.username}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="icon" variant="outline" className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleAccept(inv.id)}><Check className="h-4 w-4"/></Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDecline(inv.id)}><X className="h-4 w-4"/></Button>
                        </div>
                    </div>
                ))}
            </div>
        )
    }
    
    if (sentInvitation) {
        return (
             <div>
                <DialogDescription className="mb-4">You have a pending invitation sent to:</DialogDescription>
                <div className="flex items-center justify-between p-4 rounded-md border bg-accent/50">
                    <p className="font-semibold">{sentInvitation.invitee_email}</p>
                    <Button variant="destructive" size="sm" onClick={() => handleDecline(sentInvitation.id)}>Cancel</Button>
                </div>
            </div>
        )
    }

    return (
      <>
        <DialogDescription>
          Invite your partner by entering their email address. They will need to have a Cozy Dates account.
        </DialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleInvite)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Partner's Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="partner@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Your Partner</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
