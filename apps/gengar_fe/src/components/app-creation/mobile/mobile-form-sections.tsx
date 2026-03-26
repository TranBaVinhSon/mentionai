"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Plus, User, Bot, MessageSquare, Database, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Form } from "@/components/ui/form";
import { BasicInformationSection } from "../basic-information-section";
import { AiConfigurationSection } from "../ai-configuration-section";
import { SuggestedQuestionsSection } from "../suggested-questions-section";
import { KnowledgeSourcesSection } from "../knowledge-sources-section";
import { PublishingSettingsSection } from "../publishing-settings-section";

interface MobileFormSectionsProps {
  form: UseFormReturn<any>;
  previewUrl: string | null;
  onFileChange: (file: File | undefined) => void;
  socialConnections: {
    linkedin: boolean;
    reddit: boolean;
    medium: boolean;
    substack: boolean;
    github: boolean;
    goodreads: boolean;
    productHunt: boolean;
    facebook: boolean;
    twitter: boolean;
  };
  onSocialConnect: {
    linkedin: () => void;
    reddit: () => void;
    medium: () => void;
    substack: () => void;
    github: () => void;
    goodreads: () => void;
    productHunt: () => void;
    facebook: () => void;
    twitter: () => void;
  };
  blogLinks: string[];
  setBlogLinks: (links: string[]) => void;
  knowledgeSourcesChildren?: React.ReactNode;
}

export function MobileFormSections({
  form,
  previewUrl,
  onFileChange,
  socialConnections,
  onSocialConnect,
  blogLinks,
  setBlogLinks,
  knowledgeSourcesChildren,
}: MobileFormSectionsProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [basicInfoDrawerOpen, setBasicInfoDrawerOpen] = useState(false);
  const [aiConfigDrawerOpen, setAiConfigDrawerOpen] = useState(false);
  const [questionsDrawerOpen, setQuestionsDrawerOpen] = useState(false);
  const [knowledgeDrawerOpen, setKnowledgeDrawerOpen] = useState(false);
  const [publishingDrawerOpen, setPublishingDrawerOpen] = useState(false);

  return (
    <>
      {/* Mobile Floating Action Button */}
      <Button
        type="button"
        size="icon"
        className="fixed bottom-40 right-4 z-50 size-14 rounded-full shadow-lg lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Plus className="size-6" />
        <span className="sr-only">Open form sections</span>
      </Button>

      {/* Mobile Section Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Create Your Digital Clone</SheetTitle>
            <SheetDescription>Choose a section to edit</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="justify-start text-left h-auto py-4"
              onClick={() => {
                setMobileMenuOpen(false);
                setBasicInfoDrawerOpen(true);
              }}
            >
              <User className="mr-3 size-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Basic Information</span>
                <span className="text-sm text-muted-foreground">
                  Profile details and description
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start text-left h-auto py-4"
              onClick={() => {
                setMobileMenuOpen(false);
                setAiConfigDrawerOpen(true);
              }}
            >
              <Bot className="mr-3 size-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">AI Configuration</span>
                <span className="text-sm text-muted-foreground">
                  Personality and capabilities
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start text-left h-auto py-4"
              onClick={() => {
                setMobileMenuOpen(false);
                setQuestionsDrawerOpen(true);
              }}
            >
              <MessageSquare className="mr-3 size-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Suggested Questions</span>
                <span className="text-sm text-muted-foreground">
                  Example questions for users
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start text-left h-auto py-4"
              onClick={() => {
                setMobileMenuOpen(false);
                setKnowledgeDrawerOpen(true);
              }}
            >
              <Database className="mr-3 size-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Knowledge Sources</span>
                <span className="text-sm text-muted-foreground">
                  Connect your content
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start text-left h-auto py-4"
              onClick={() => {
                setMobileMenuOpen(false);
                setPublishingDrawerOpen(true);
              }}
            >
              <Globe className="mr-3 size-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Publishing Settings</span>
                <span className="text-sm text-muted-foreground">
                  Privacy and access control
                </span>
              </div>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Drawers for Each Section */}
      {/* Basic Information Drawer */}
      <Drawer open={basicInfoDrawerOpen} onOpenChange={setBasicInfoDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Basic Information</DrawerTitle>
            <DrawerDescription>
              Tell us about yourself - this helps create your digital clone
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">
            <Form {...form}>
              <BasicInformationSection
                form={form}
                open={true}
                onOpenChange={() => {}}
                previewUrl={previewUrl}
                onFileChange={onFileChange}
              />
            </Form>
          </div>
        </DrawerContent>
      </Drawer>

      {/* AI Configuration Drawer */}
      <Drawer open={aiConfigDrawerOpen} onOpenChange={setAiConfigDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>AI Configuration</DrawerTitle>
            <DrawerDescription>
              Configure how your digital clone responds to users
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">
            <Form {...form}>
              <AiConfigurationSection
                form={form}
                open={true}
                onOpenChange={() => {}}
              />
            </Form>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Suggested Questions Drawer */}
      <Drawer open={questionsDrawerOpen} onOpenChange={setQuestionsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Suggested Questions</DrawerTitle>
            <DrawerDescription>
              Questions that users can ask your digital clone
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">
            <Form {...form}>
              <SuggestedQuestionsSection
                form={form}
                open={true}
                onOpenChange={() => {}}
              />
            </Form>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Knowledge Sources Drawer */}
      <Drawer open={knowledgeDrawerOpen} onOpenChange={setKnowledgeDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Knowledge Sources</DrawerTitle>
            <DrawerDescription>
              Connect your content to train your digital clone
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">
            <Form {...form}>
              <KnowledgeSourcesSection
                form={form}
                open={true}
                onOpenChange={() => {}}
                socialConnections={socialConnections}
                onSocialConnect={onSocialConnect}
                blogLinks={blogLinks}
                setBlogLinks={setBlogLinks}
              >
                {knowledgeSourcesChildren}
              </KnowledgeSourcesSection>
            </Form>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Publishing Settings Drawer */}
      <Drawer
        open={publishingDrawerOpen}
        onOpenChange={setPublishingDrawerOpen}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Publishing Settings</DrawerTitle>
            <DrawerDescription>
              Control how your digital clone can be accessed
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">
            <Form {...form}>
              <PublishingSettingsSection
                form={form}
                open={true}
                onOpenChange={() => {}}
              />
            </Form>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
