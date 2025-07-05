# Goals and Memories App

This is a web application built with Next.js and Firebase that helps users track their personal goals, manage tasks, and create memories.

## Features

* Goal tracking
* Task management
* Memory creation and storage
* User authentication with Supabase Authentication
* Data storage with Supabase Postgres

## Installation & Supabase Setup

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Set up a Firebase project and configure the application with your Firebase project details.
4. Run the development server using `npm run dev`.

### Supabase Database Migration

To set up your database tables and security policies, you need to run the SQL script provided in this project.

1. Go to your Supabase project dashboard.
2. In the left menu, find and click on **SQL Editor**.
3. Click on **+ New query**.
4. Copy the entire content from `supabase/migrations/0000_initial_schema.sql` in this project.
5. Paste the content into the Supabase SQL Editor.
6. Click the **RUN** button.

This will create all the necessary tables, relationships, and security policies for the application to work correctly.
