## Amazon ASIN extractor

This actor collects all subcategories and their metadata from Amazon.

### Implementation notes
- There are lot of params by default in any category URL.

#### Categories
- Each category has its ID
- The IDs are present in the URL as `rh=n:16225007011,n:172456,n:11548951011` (3 categories from parent to a child)
- They are usually URI encoded as `rh=n%3A16225007011%2Cn%3A172456%2Cn%3A11548951011`
- There are multiple ways how to access a certain (sub)category:
    - Clicking through parent categories will gives you a nested categories (e.g. `rh=n:16225007011,n:172456,n:11548951011`)
    - If you open just the last ID, e.g. `rh=n:11548951011`, it seems to give you more results. That is probably because it then finds products from all possible parents.
    - There are also some random links that can link you too a category but they should not be important
- The ideal seems to be find IDs of all subcategories and then enqueue them separately with a "minimal" URL.
