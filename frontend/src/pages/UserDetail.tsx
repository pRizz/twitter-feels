// User Detail page - Shows detailed sentiment analysis for a specific user
// TODO: Implement user detail functionality

import { useParams } from 'react-router-dom';

export default function UserDetail() {
  const { id } = useParams();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">User Detail</h1>
      <p className="text-muted-foreground">
        Viewing user with ID: {id}
      </p>
      <p className="text-muted-foreground mt-4">
        User profile, emotion trends, and tweet list coming soon.
      </p>
    </div>
  );
}
