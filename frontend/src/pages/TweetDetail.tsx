// Tweet Detail page - Shows detailed sentiment breakdown for a specific tweet
// TODO: Implement tweet detail functionality

import { useParams } from 'react-router-dom';

export default function TweetDetail() {
  const { id } = useParams();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Tweet Detail</h1>
      <p className="text-muted-foreground">
        Viewing tweet with ID: {id}
      </p>
      <p className="text-muted-foreground mt-4">
        Tweet content and emotion breakdown coming soon.
      </p>
    </div>
  );
}
