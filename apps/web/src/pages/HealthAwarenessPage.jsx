import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Card,
  Text,
  Badge,
  Group,
  Select,
  TextInput,
  Button,
  Modal,
  Stack,
  Loader,
  Center,
  Alert,
  Pagination,
  Paper,
  Image
} from '@mantine/core';
import {
  IconSearch,
  IconBook,
  IconAlertCircle,
  IconCalendar,
  IconUser
} from '@tabler/icons-react';
import { HEALTH_ARTICLE_CATEGORIES } from '@arogyafirst/shared';
import { usePageTitle } from '../hooks/usePageTitle.js';
import useAuthFetch from '../hooks/useAuthFetch.js';

export default function HealthAwarenessPage() {
  usePageTitle('Health Awareness');
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const { loading, fetchData } = useAuthFetch();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);

  const limit = 9;

  // Category options for Select component
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: HEALTH_ARTICLE_CATEGORIES.GENERAL, label: 'General Health' },
    { value: HEALTH_ARTICLE_CATEGORIES.NUTRITION, label: 'Nutrition' },
    { value: HEALTH_ARTICLE_CATEGORIES.EXERCISE, label: 'Exercise' },
    { value: HEALTH_ARTICLE_CATEGORIES.MENTAL_HEALTH, label: 'Mental Health' },
    { value: HEALTH_ARTICLE_CATEGORIES.CHRONIC_DISEASES, label: 'Chronic Diseases' },
    { value: HEALTH_ARTICLE_CATEGORIES.PREVENTIVE_CARE, label: 'Preventive Care' }
  ];

  // Fetch articles
  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams({
        ...(selectedCategory && { category: selectedCategory }),
        ...(searchQuery && { search: searchQuery }),
        page: page.toString(),
        limit: limit.toString()
      });

      const result = await fetchData(`/api/health-awareness/articles?${params.toString()}`);

      if (result?.success) {
        setArticles(result.data.articles || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setError(null);
      }
    } catch (err) {
      setError('Failed to load articles. Please try again later.');
      console.error('Fetch articles error:', err);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, searchQuery, page]);

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    setPage(1);
  };

  const handleArticleClick = (article) => {
    setSelectedArticle(article);
    setModalOpened(true);
  };

  const getCategoryLabel = (category) => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option?.label || category;
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      [HEALTH_ARTICLE_CATEGORIES.GENERAL]: 'blue',
      [HEALTH_ARTICLE_CATEGORIES.NUTRITION]: 'green',
      [HEALTH_ARTICLE_CATEGORIES.EXERCISE]: 'orange',
      [HEALTH_ARTICLE_CATEGORIES.MENTAL_HEALTH]: 'purple',
      [HEALTH_ARTICLE_CATEGORIES.CHRONIC_DISEASES]: 'red',
      [HEALTH_ARTICLE_CATEGORIES.PREVENTIVE_CARE]: 'teal'
    };
    return colorMap[category] || 'gray';
  };

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">Health Awareness</Title>
      <Text c="dimmed" mb="xl">
        Explore articles and resources to help you maintain a healthy lifestyle
      </Text>

      {/* Filters */}
      <Paper p="md" mb="xl" withBorder>
        <Group>
          <Select
            placeholder="Filter by category"
            data={categoryOptions}
            value={selectedCategory || ''}
            onChange={(value) => {
              setSelectedCategory(value || null);
              setPage(1);
            }}
            clearable
            style={{ flex: 1, minWidth: 200 }}
          />
          <TextInput
            placeholder="Search articles..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{ flex: 2, minWidth: 200 }}
          />
          <Button variant="light" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </Group>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      )}

      {/* Error State */}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && articles.length === 0 && (
        <Paper p="xl" withBorder>
          <Center>
            <Stack align="center">
              <IconBook size={48} stroke={1.5} color="gray" />
              <Text size="lg" fw={500}>No articles found</Text>
              <Text size="sm" c="dimmed">Try adjusting your search or filters</Text>
            </Stack>
          </Center>
        </Paper>
      )}

      {/* Articles Grid */}
      {!loading && !error && articles.length > 0 && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {articles.map((article) => (
              <Card
                key={article.id}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => handleArticleClick(article)}
              >
                <Card.Section>
                  <Image
                    src={article.imageUrl}
                    height={160}
                    alt={article.title}
                    radius="md"
                  />
                </Card.Section>

                <Group justify="space-between" mt="md" mb="xs">
                  <Text fw={500} lineClamp={2}>{article.title}</Text>
                </Group>

                <Badge color={getCategoryColor(article.category)} variant="light" mb="xs">
                  {getCategoryLabel(article.category)}
                </Badge>

                <Text size="sm" c="dimmed" lineClamp={3} mb="md">
                  {article.summary}
                </Text>

                <Group gap="xs">
                  <IconUser size={14} />
                  <Text size="xs" c="dimmed">{article.author}</Text>
                  <IconCalendar size={14} />
                  <Text size="xs" c="dimmed">
                    {new Date(article.publishedDate).toLocaleDateString()}
                  </Text>
                </Group>

                <Group gap={4} mt="xs">
                  {article.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} size="xs" variant="dot">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Card>
            ))}
          </SimpleGrid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Center mt="xl">
              <Pagination total={totalPages} value={page} onChange={setPage} />
            </Center>
          )}
        </>
      )}

      {/* Article Details Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={selectedArticle?.title}
        size="lg"
      >
        {selectedArticle && (
          <Stack gap="md">
            <Image
              src={selectedArticle.imageUrl}
              height={200}
              radius="md"
              alt={selectedArticle.title}
            />

            <Group>
              <Badge color={getCategoryColor(selectedArticle.category)} variant="light">
                {getCategoryLabel(selectedArticle.category)}
              </Badge>
              <Group gap="xs">
                <IconUser size={14} />
                <Text size="sm">{selectedArticle.author}</Text>
              </Group>
              <Group gap="xs">
                <IconCalendar size={14} />
                <Text size="sm">
                  {new Date(selectedArticle.publishedDate).toLocaleDateString()}
                </Text>
              </Group>
            </Group>

            <Text size="sm" fw={500}>
              {selectedArticle.summary}
            </Text>

            <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
              {selectedArticle.content}
            </Text>

            <Group gap={8}>
              {selectedArticle.tags?.map((tag) => (
                <Badge key={tag} size="sm" variant="outline">
                  {tag}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
