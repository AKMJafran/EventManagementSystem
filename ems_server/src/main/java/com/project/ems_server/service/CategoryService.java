package com.project.ems_server.service;

import com.project.ems_server.dto.request.CategoryRequest;
import com.project.ems_server.dto.response.CategoryResponse;
import com.project.ems_server.entity.Category;
import com.project.ems_server.repository.CategoryRepository;
import com.project.ems_server.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final EventRepository eventRepository;

    /**
     * Creates a main category (parentId = null)
     */
    public CategoryResponse createMainCategory(CategoryRequest categoryRequest, Long adminId) {
        Category category = Category.builder()
                .name(categoryRequest.getName())
                .parentId(null)
                .createdBy(adminId)
                .createdAt(LocalDateTime.now())
                .build();

        Category savedCategory = categoryRepository.save(category);
        return mapToResponse(savedCategory);
    }

    /**
     * Creates a sub-category under a parent category
     */
    public CategoryResponse createSubCategory(CategoryRequest categoryRequest, Long parentId, Long adminId) {
        // Verify parent category exists
     if(!categoryRepository.existsById(parentId)) {
            throw new RuntimeException("Parent category not found with id: " + parentId);
        }

        Category subCategory = Category.builder()
                .name(categoryRequest.getName())
                .parentId(parentId)
                .createdBy(adminId)
                .createdAt(LocalDateTime.now())
                .build();

        Category savedCategory = categoryRepository.save(subCategory);
        return mapToResponse(savedCategory);
    }

    /**
     * Gets all main categories with their nested sub-categories
     */
    public List<CategoryResponse> getAllMainCategories() {
        List<Category> mainCategories = categoryRepository.findByParentIdIsNull();
        return mainCategories.stream()
                .map(this::mapToResponseWithSubCategories)
                .collect(Collectors.toList());
    }

    /**
     * Gets all sub-categories of a parent category
     */
    public List<CategoryResponse> getSubCategories(Long parentId) {
        List<Category> subCategories = categoryRepository.findByParentId(parentId);
        return subCategories.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Deletes a category if no events are linked to it
     */
    public void deleteCategory(Long categoryId) {
        // Verify category exists
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + categoryId));

        // Check if any events are linked to this category
        List<Long> linkedEventIds = eventRepository.findByCategoryId(categoryId).stream()
                .map(event -> event.getId())
                .collect(Collectors.toList());

        if (!linkedEventIds.isEmpty()) {
            throw new RuntimeException("Cannot delete category. " + linkedEventIds.size() 
                    + " event(s) are linked to this category");
        }

        // If it's a main category, check if it has sub-categories with events
        if (category.getParentId() == null) {
            List<Category> subCategories = categoryRepository.findByParentId(categoryId);
            for (Category subCategory : subCategories) {
                List<Long> subCategoryEventIds = eventRepository.findByCategoryId(subCategory.getId()).stream()
                        .map(event -> event.getId())
                        .collect(Collectors.toList());
                if (!subCategoryEventIds.isEmpty()) {
                    throw new RuntimeException("Cannot delete main category. "
                            + "Sub-categories have " + subCategoryEventIds.size() + " event(s) linked");
                }
            }
        }

        categoryRepository.delete(category);
    }

    /**
     * Maps Category entity to CategoryResponse with sub-categories
     */
    private CategoryResponse mapToResponseWithSubCategories(Category category) {
        List<CategoryResponse> subCategories = category.getSubCategories() != null
                ? category.getSubCategories().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList())
                : List.of();

        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .parentId(category.getParentId())
                .subCategories(subCategories)
                .build();
    }

    /**
     * Maps Category entity to CategoryResponse
     */
    private CategoryResponse mapToResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .parentId(category.getParentId())
                .subCategories(null)
                .build();
    }
}
