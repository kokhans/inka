// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using System.Xml.Serialization;

#pragma warning disable CS8618

namespace Inka.Modules.Operations.Sitemap;

public sealed record SitemapLocation
{
    [XmlElement("loc")] public string Url { get; set; }
    [XmlElement("changefreq")] public SitemapChangeFrequency? ChangeFrequency { get; set; }
    [XmlElement("lastmod")] public DateTime? LastModified { get; set; }
    [XmlElement("priority")] public double? Priority { get; set; }

    [XmlElement("image", Namespace = "http://www.google.com/schemas/sitemap-image/1.1")]
    public List<SitemapImage>? Images { get; set; }

    public bool ShouldSerializeChangeFrequency() => ChangeFrequency.HasValue;
    public bool ShouldSerializeLastModified() => LastModified.HasValue;
    public bool ShouldSerializePriority() => Priority.HasValue;
    public bool ShouldSerializeImages() => Images is not null && Images.Count > 0;
}