package com.project.ems_server.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "categories")
public class Category {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "parent_id")
    private Long parentId;
    
    @ManyToOne
    @JoinColumn(name = "parent_id", insertable = false, updatable = false)
    private Category parentCategory;
    
    @OneToMany(targetEntity = Category.class, mappedBy = "parentCategory")
    private List<Category> subCategories;
    
    @Column(name = "created_by", nullable = false)
    private Long createdBy;
    
    @ManyToOne
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User creator;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
